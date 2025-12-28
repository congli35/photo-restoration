export interface RestorationData {
	id: string;
	status: string;
	createdAt: string;
	url: string | null;
}

export interface PhotoCardData {
	id: string;
	createdAt: string;
	originalUrl: string | null;
	restorations: RestorationData[];
}
