import { addMessageToChat } from "./procedures/add-message-to-chat";
import { createChat } from "./procedures/create-chat";
import { createImageUploadUrl } from "./procedures/create-image-upload-url";
import { deleteChat } from "./procedures/delete-chat";
import { findChat } from "./procedures/find-chat";
import { getRestorationProcedure } from "./procedures/get-restoration";
import { listChats } from "./procedures/list-chats";
import { restoreImageProcedure } from "./procedures/restore-image";
import { triggerRestorationProcedure } from "./procedures/trigger-restoration";
import { updateChat } from "./procedures/update-chat";

export const aiRouter = {
	chats: {
		list: listChats,
		find: findChat,
		create: createChat,
		update: updateChat,
		delete: deleteChat,
		messages: {
			add: addMessageToChat,
		},
		restore: restoreImageProcedure,
		getRestoration: getRestorationProcedure,
	},
	imageUploadUrl: createImageUploadUrl,
	triggerRestoration: triggerRestorationProcedure,
};
