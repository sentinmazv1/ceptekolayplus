
import { useState, useEffect, useRef } from 'react';
import { Send, Clock, User, Loader2 } from 'lucide-react';

interface CollectionNote {
    id: number;
    note: string;
    user_email: string;
    created_at: string;
}

interface CollectionNotesProps {
    leadId: string;
}

export function CollectionNotes({ leadId }: CollectionNotesProps) {
    const [notes, setNotes] = useState<CollectionNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotes();
        // Poll for new notes every 30 seconds? Or just on load.
    }, [leadId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [notes]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/collection/notes?leadId=${leadId}`);
            const json = await res.json();
            if (json.success) setNotes(json.data);
        } catch (error) {
            console.error('Notes fetch error', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newNote.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/collection/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, note: newNote })
            });
            const json = await res.json();
            if (json.success) {
                setNotes(prev => [...prev, json.data]);
                setNewNote('');
            }
        } catch (error) {
            console.error('Note send error', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-[400px] shadow-sm">
            <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageCircleHistory className="w-4 h-4 text-indigo-600" />
                    Tahsilat Görüşme Geçmişi
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                {loading && <div className="flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}
                {!loading && notes.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-10">Henüz not yok.</div>
                )}
                {notes.map((note) => (
                    <div key={note.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                            <span className="font-medium text-gray-600">{note.user_email?.split('@')[0]}</span>
                            <span>•</span>
                            <span>{new Date(note.created_at).toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm text-sm text-gray-700 w-fit max-w-[90%]">
                            {note.note}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-white border-t border-gray-200 rounded-b-xl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Görüşme notu ekle..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newNote.trim() || submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg disabled:opacity-50 transition-all"
                    >
                        {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MessageCircleHistory({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M12 8v4l3 3" />
        </svg>
    )
}
