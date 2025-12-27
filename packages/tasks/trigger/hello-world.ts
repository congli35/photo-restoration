import { task } from "@trigger.dev/sdk";

const helloWorld = task({
	//1. Use a unique id for each task
	id: "hello-world",
	//2. The run function is the main function of the task
	run: async (payload: { message: string }) => {
		//3. You can write code that runs for a long time here, there are no timeouts
		console.log(payload.message);
	},
});
