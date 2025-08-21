import React, { useState, useEffect } from 'react';
import { HybridSession, SessionStatus } from '../types';
import { api } from '../services/api';
import { Clock, Loader2, FileText, Video, Send, CheckSquare, Shield, User, Edit3, MessageSquare } from 'lucide-react';

const CertifierDashboardPage: React.FC = () => {
    const [activeSession, setActiveSession] = useState<HybridSession | null>(null);
    const certifierId = 1; // Mock certifier ID

    // This effect will poll for updates on the active session
    useEffect(() => {
        if (!activeSession) return;
        const interval = setInterval(async () => {
            const updated = await api.getSessionStatus(activeSession.id);
            if (updated) {
                setActiveSession(updated);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [activeSession]);


    if (activeSession) {
        return <SessionWorkspace session={activeSession} certifierId={certifierId} onEndSession={() => setActiveSession(null)} />;
    }
    
    return <QueuePanel certifierId={certifierId} onAcceptSession={setActiveSession} />;
};

const QueuePanel: React.FC<{ certifierId: number, onAcceptSession: (session: HybridSession) => void }> = ({ certifierId, onAcceptSession }) => {
    const [queue, setQueue] = useState<HybridSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQueue = async () => {
            // No need to set loading to true on refetch
            const sessions = await api.getCertifierQueue();
            setQueue(sessions);
            setIsLoading(false);
        };
        
        fetchQueue();
        const interval = setInterval(fetchQueue, 5000); // Poll for new sessions
        return () => clearInterval(interval);
    }, [certifierId]);

    const handleAccept = async (sessionId: number) => {
        const acceptedSession = await api.acceptSession(sessionId, certifierId);
        onAcceptSession(acceptedSession);
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Clock className="w-6 h-6"/> Cola de Certificación</h2>
            <p className="text-slate-500 mb-6">Sesiones pendientes esperando ser atendidas.</p>
            {isLoading && !queue.length ? (
                <div className="text-center py-8 text-slate-500 flex items-center justify-center gap-2"> <Loader2 className="animate-spin w-6 h-6"/> Cargando...</div>
            ) : !queue.length ? (
                <div className="text-center py-8 text-slate-500">No hay sesiones en la cola.</div>
            ) : (
                <div className="space-y-4">
                    {queue.map(session => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border transition-all hover:shadow-md hover:border-blue-300">
                            <div>
                                <p className="font-bold text-slate-800">Sesión #{session.id} - {session.templateName}</p>
                                <p className="text-sm text-slate-600">Cliente: {session.clientName} | Tipo: <span className="font-medium uppercase">{session.sessionType}</span></p>
                            </div>
                            <button onClick={() => handleAccept(session.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Aceptar</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SessionWorkspace: React.FC<{ session: HybridSession, certifierId: number, onEndSession: () => void }> = ({ session, certifierId, onEndSession }) => {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [docContent, setDocContent] = useState(session.documentContent || '');

    const handleSendForReview = async () => {
        await api.sendDocumentForReview(session.id, docContent);
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        await api.finalizeSession(session.id);
        alert(`Sesión #${session.id} finalizada y documento enviado.`);
        setIsFinalizing(false);
        onEndSession();
    }

    const isDocSent = session.status !== SessionStatus.ACTIVE_CALL;
    const isClientApproved = session.status === SessionStatus.PENDING_CLIENT_PACKAGE || session.status === SessionStatus.PENDING_FEA_SIGNATURE;
    const isClientSigned = session.status === SessionStatus.PENDING_FEA_SIGNATURE;


    return (
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Espacio de Trabajo - Sesión #{session.id}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Video/> Videollamada</h3>
                        <div className="aspect-video bg-slate-800 text-white rounded-lg flex flex-col items-center justify-center relative">
                             <div className="absolute top-2 left-3 text-xs bg-black/30 px-2 py-1 rounded-full">EN VIVO</div>
                            <User className="w-16 h-16"/>
                            <p className="font-medium mt-2">{session.clientName}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Edit3/> Editor de Documento</h3>
                        <textarea 
                            value={docContent}
                            onChange={(e) => setDocContent(e.target.value)}
                            disabled={isDocSent}
                            className="w-full h-64 border rounded-lg p-4 bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                </div>
                {/* Control Panel */}
                <div className="lg:col-span-2 bg-slate-50 rounded-lg p-6 border">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Shield/> Panel de Control</h3>
                     <div className="space-y-4">
                        <div className="text-sm p-3 bg-blue-100 text-blue-800 rounded-lg">
                            <p className="font-bold">Siguiente Paso:</p>
                            <p>{
                                !isDocSent ? "Redacte el documento y envíelo al cliente." :
                                !isClientApproved ? "Esperando aprobación del cliente." :
                                !isClientSigned ? "Esperando firma del cliente." :
                                "Cliente ha firmado. Finalice la sesión."
                            }</p>
                        </div>

                        <button 
                            onClick={handleSendForReview}
                            disabled={isDocSent}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
                           <Send className="w-4 h-4"/> Enviar a Revisión
                        </button>
                        
                        <div className="border-t my-4"></div>
                        <p className="text-xs text-center text-slate-500">Una vez el cliente firme, podrá finalizar el proceso.</p>
                        <button 
                            onClick={handleFinalize}
                            disabled={!isClientSigned || isFinalizing}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 transition-colors">
                            {isFinalizing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Shield className="w-4 h-4" />}
                            {isFinalizing ? 'Finalizando...' : 'Firmar con FEA y Finalizar'}
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default CertifierDashboardPage;
