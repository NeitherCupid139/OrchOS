import { os } from "@/server/orpc/base";
import { InboxService } from "@/server/modules/inbox/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const inboxRouter = {
  listThreads: os.inbox.listThreads.handler(async ({ input }) => {
    return InboxService.list(await getLocalDb(), input);
  }),
  getThread: os.inbox.getThread.handler(async ({ input }) => {
    return InboxService.get(await getLocalDb(), input.id);
  }),
  updateThread: os.inbox.updateThread.handler(async ({ input }) => {
    return InboxService.update(await getLocalDb(), input.id, {
      title: input.title,
      summary: input.summary,
      status: input.status,
      priority: input.priority,
      archived: input.archived,
    });
  }),
  listMessages: os.inbox.listMessages.handler(async ({ input }) => {
    return InboxService.listMessages(await getLocalDb(), input.threadId);
  }),
  addMessage: os.inbox.addMessage.handler(async ({ input }) => {
    return InboxService.addMessage(await getLocalDb(), input.threadId, {
      messageType: input.messageType,
      senderType: input.senderType,
      senderId: input.senderId,
      senderName: input.senderName,
      subject: input.subject,
      body: input.body,
      to: input.to,
      cc: input.cc,
      problemId: input.problemId,
      metadata: input.metadata,
    });
  }),
};
