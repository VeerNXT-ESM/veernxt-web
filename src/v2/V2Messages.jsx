import MessagingWorkspace from '../components/MessagingWorkspace';

/** /v2/messages — the messaging workspace with pending network invitations shown in place. */
export default function V2Messages() {
  return (
    <div className="tac-msg">
      <MessagingWorkspace showInvites />
    </div>
  );
}
