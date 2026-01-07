import {
	createPurchase,
	db,
	deletePurchaseBySubscriptionId,
	getPurchaseBySubscriptionId,
	updatePurchase,
} from "@repo/database";
import type { Prisma } from "@repo/database/prisma/generated/client";
import { logger } from "@repo/logs";
import Stripe from "stripe";
import { setCustomerIdToEntity } from "../../src/lib/customer";
import { getPlanCreditsByProductId } from "../../src/lib/plan-credits";
import type {
	CancelSubscription,
	CreateCheckoutLink,
	CreateCustomerPortalLink,
	SetSubscriptionSeats,
	WebhookHandler,
} from "../../types";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
	if (stripeClient) {
		return stripeClient;
	}

	const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

	if (!stripeSecretKey) {
		throw new Error("Missing env variable STRIPE_SECRET_KEY");
	}

	stripeClient = new Stripe(stripeSecretKey);

	return stripeClient;
}

interface GrantCreditsParams {
	userId: string;
	amount: number;
	reason: string;
	relatedEntityId: string;
	relatedEntityType: string;
	metadata?: Prisma.InputJsonValue;
}

async function grantCreditsIfNeeded({
	userId,
	amount,
	reason,
	relatedEntityId,
	relatedEntityType,
	metadata,
}: GrantCreditsParams) {
	if (amount <= 0) {
		return;
	}

	await db.$transaction(async (tx) => {
		const existing = await tx.creditTransaction.findFirst({
			where: {
				userId,
				relatedEntityId,
				relatedEntityType,
			},
		});

		if (existing) {
			return;
		}

		await tx.creditBalance.upsert({
			where: { userId },
			create: { userId, balance: 0 },
			update: {},
		});

		const updatedBalance = await tx.creditBalance.update({
			where: { userId },
			data: {
				balance: {
					increment: amount,
				},
			},
		});

		await tx.creditTransaction.create({
			data: {
				userId,
				type: "TOPUP",
				amount,
				balanceAfter: updatedBalance.balance,
				reason,
				relatedEntityId,
				relatedEntityType,
				...(metadata ? { metadata } : {}),
			},
		});
	});
}

export const createCheckoutLink: CreateCheckoutLink = async (options) => {
	const stripeClient = getStripeClient();
	const {
		type,
		productId,
		redirectUrl,
		customerId,
		organizationId,
		userId,
		trialPeriodDays,
		seats,
		email,
	} = options;

	const metadata = {
		organization_id: organizationId || null,
		user_id: userId || null,
	};

	const response = await stripeClient.checkout.sessions.create({
		mode: type === "subscription" ? "subscription" : "payment",
		success_url: redirectUrl ?? "",
		line_items: [
			{
				quantity: seats ?? 1,
				price: productId,
			},
		],
		...(customerId ? { customer: customerId } : { customer_email: email }),
		...(type === "one-time"
			? {
					payment_intent_data: {
						metadata,
					},
					customer_creation: "always",
				}
			: {
					subscription_data: {
						metadata,
						trial_period_days: trialPeriodDays,
					},
				}),
		metadata,
	});

	return response.url;
};

export const createCustomerPortalLink: CreateCustomerPortalLink = async ({
	customerId,
	redirectUrl,
}) => {
	const stripeClient = getStripeClient();

	const response = await stripeClient.billingPortal.sessions.create({
		customer: customerId,
		return_url: redirectUrl ?? "",
	});

	return response.url;
};

export const setSubscriptionSeats: SetSubscriptionSeats = async ({
	id,
	seats,
}) => {
	const stripeClient = getStripeClient();

	const subscription = await stripeClient.subscriptions.retrieve(id);

	if (!subscription) {
		throw new Error("Subscription not found.");
	}

	await stripeClient.subscriptions.update(id, {
		items: [
			{
				id: subscription.items.data[0].id,
				quantity: seats,
			},
		],
	});
};

export const cancelSubscription: CancelSubscription = async (id) => {
	const stripeClient = getStripeClient();

	await stripeClient.subscriptions.cancel(id);
};

export const webhookHandler: WebhookHandler = async (req) => {
	const stripeClient = getStripeClient();

	if (!req.body) {
		return new Response("Invalid request.", {
			status: 400,
		});
	}

	let event: Stripe.Event | undefined;

	try {
		event = await stripeClient.webhooks.constructEventAsync(
			await req.text(),
			req.headers.get("stripe-signature") as string,
			process.env.STRIPE_WEBHOOK_SECRET as string,
		);
	} catch (e) {
		logger.error(e);

		return new Response("Invalid request.", {
			status: 400,
		});
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const { mode, metadata, customer, id } = event.data.object;

				if (mode === "subscription") {
					break;
				}

				const checkoutSession =
					await stripeClient.checkout.sessions.retrieve(id, {
						expand: ["line_items"],
					});

				const productId = checkoutSession.line_items?.data[0].price?.id;

				if (!productId) {
					return new Response("Missing product ID.", {
						status: 400,
					});
				}

				await createPurchase({
					organizationId: metadata?.organization_id || null,
					userId: metadata?.user_id || null,
					customerId: customer as string,
					type: "ONE_TIME",
					productId,
				});

				await setCustomerIdToEntity(customer as string, {
					organizationId: metadata?.organization_id,
					userId: metadata?.user_id,
				});

				break;
			}
			case "customer.subscription.created": {
				const { metadata, customer, items, id, status } =
					event.data.object;

				const productId = items?.data[0].price?.id;
				const userId = metadata?.user_id;

				if (!productId) {
					return new Response("Missing product ID.", {
						status: 400,
					});
				}

				await createPurchase({
					subscriptionId: id,
					organizationId: metadata?.organization_id || null,
					userId: metadata?.user_id || null,
					customerId: customer as string,
					type: "SUBSCRIPTION",
					productId,
					status: event.data.object.status,
				});

				await setCustomerIdToEntity(customer as string, {
					organizationId: metadata?.organization_id,
					userId: metadata?.user_id,
				});

				if (status !== "active" && status !== "trialing") {
					logger.warn("Subscription not active for credits", {
						status,
						subscriptionId: id,
					});
					break;
				}

				if (!userId) {
					logger.warn("Missing user id for subscription credits", {
						subscriptionId: id,
					});
					break;
				}

				const planMatch = getPlanCreditsByProductId(productId);

				if (!planMatch) {
					logger.warn("No plan matched subscription product", {
						productId,
						subscriptionId: id,
					});
					break;
				}

				await grantCreditsIfNeeded({
					userId,
					amount: planMatch.credits,
					reason: "Subscription credits",
					relatedEntityId: id,
					relatedEntityType: "SUBSCRIPTION_CREATE",
					metadata: {
						planId: planMatch.planId,
						productId,
						stripeEventId: event.id,
					},
				});

				break;
			}
			case "customer.subscription.updated": {
				const subscriptionId = event.data.object.id;
				const userId = event.data.object.metadata?.user_id;
				const productId = event.data.object.items?.data[0].price?.id;
				const status = event.data.object.status;
				const currentPeriodStart =
					event.data.object.items?.data[0]?.current_period_start ??
					null;
				const previousPeriodStart =
					event.data.previous_attributes?.items?.data?.[0]
						?.current_period_start ?? null;
				const isNewPeriod =
					typeof previousPeriodStart === "number" &&
					typeof currentPeriodStart === "number" &&
					currentPeriodStart !== previousPeriodStart;

				const existingPurchase =
					await getPurchaseBySubscriptionId(subscriptionId);

				if (existingPurchase) {
					// Handle subscription renewal credits
					if (isNewPeriod && userId && status === "active") {
						const planMatch = getPlanCreditsByProductId(
							productId ?? "",
						);

						if (!planMatch) {
							logger.warn("No plan matched renewal product", {
								productId,
								subscriptionId,
							});
						} else {
							const renewalEntityId = `${subscriptionId}:${currentPeriodStart}`;

							await grantCreditsIfNeeded({
								userId,
								amount: planMatch.credits,
								reason: "Subscription renewal credits",
								relatedEntityId: renewalEntityId,
								relatedEntityType: "SUBSCRIPTION_CYCLE",
								metadata: {
									planId: planMatch.planId,
									productId,
									subscriptionId,
									currentPeriodStart,
									stripeEventId: event.id,
								},
							});
						}
					}

					await updatePurchase({
						id: existingPurchase.id,
						status,
						productId: productId ?? existingPurchase.productId,
					});
				}

				break;
			}
			case "customer.subscription.deleted": {
				await deletePurchaseBySubscriptionId(event.data.object.id);

				break;
			}

			default:
				return new Response("Unhandled event type.", {
					status: 200,
				});
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		return new Response(
			`Webhook error: ${error instanceof Error ? error.message : ""}`,
			{
				status: 400,
			},
		);
	}
};
