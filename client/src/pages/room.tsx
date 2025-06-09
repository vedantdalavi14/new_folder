import { useParams } from 'wouter';
import { P2PFileSender } from '@/components/P2PFileSender';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  
  return <P2PFileSender roomId={roomId} isReceiver={true} />;
}
