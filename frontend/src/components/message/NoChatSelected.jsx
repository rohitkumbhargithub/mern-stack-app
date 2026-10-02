import { MessageCircle } from 'lucide-react';

export const NoChatSelected = ({ authUser }) => {
    return (
        <div className='flex items-center justify-center w-full h-full bg-background'>
            <div className='px-4 text-center text-muted-foreground flex flex-col items-center gap-4'>
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Welcome, {authUser?.name}!</h2>
                    <p className="text-sm">Select a conversation from the sidebar to start chatting.</p>
                </div>
            </div>
        </div>
    );
};
