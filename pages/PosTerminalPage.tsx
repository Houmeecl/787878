import React, { useState, useEffect, useCallback } from 'react';
import { HybridSession, SessionStatus, SessionType, Transaction } from '../types';
import { api } from '../services/api';
import { ArrowRight, CheckCircle, Clock, CreditCard, Loader2, FileText, Users, Wifi, MessageSquare, Edit } from 'lucide-react';

type FlowState = 'SELECTING_SERVICE' | 'ENTERING_DATA' | 'PROCESSING_PAYMENT' | 'WAITING_IN_QUEUE' | 'LIVE_SESSION' | 'COMPLETED';

const PosTerminalPage: React.FC = () => {
    const [flowState, setFlowState] = useState<FlowState>('SELECTING_SERVICE');
    const [sessionType, setSessionType] = useState<SessionType | null>(null);
    const [template, setTemplate] = useState<string | null>(null);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [session, setSession] = useState<HybridSession | null>(null);
    const [clientData, setClientData] = useState({ name: '', email: '' });
    const [isLoading, setIsLoading] = useState(false);
    
    // Polling for session status update
    useEffect(() => {
        if ((flowState === 'WAITING_IN_QUEUE' || flowState === 'LIVE_SESSION') && session?.id) {
            const interval = setInterval(async () => {
                const updatedSession = await api.getSessionStatus(session.id);
                if (updatedSession) {
                    setSession(updatedSession); // Always update session with latest data
                    if (flowState === 'WAITING_IN_QUEUE' && updatedSession.status === SessionStatus.ACTIVE_CALL) {
                       setFlowState('LIVE_SESSION');
                    }
                    if(updatedSession.status === SessionStatus.COMPLETED) {
                        setFlowState('COMPLETED');
                    }
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [flowState, session]);

    const handleServiceSelect = (type: SessionType, selectedTemplate: string) => {
        setSessionType(type);
        setTemplate(selectedTemplate);
        setFlowState('ENTERING_DATA');
    };
    
    const handleDataSubmit = async (data: {name: string, email: string}) => {
        if (!template || !sessionType) return;
        setIsLoading(true);
        setClientData(data);
        const newTransaction = await api.initiateTransaction(template, sessionType);
        setTransaction(newTransaction);
        setIsLoading(false);
        setFlowState('PROCESSING_PAYMENT');
    }

    const handlePaymentSuccess = async () => {
        if (!transaction || !sessionType || !template) return;
        setIsLoading(true);
        const newSession = await api.confirmPayment(transaction.id, clientData.name, clientData.email, template, sessionType);
        setSession(newSession);
        setIsLoading(false);
        setFlowState('WAITING_IN_QUEUE');
    };

    const handleReset = () => {
        setFlowState('SELECTING_SERVICE');
        setSession(null);
        setTransaction(null);
        setClientData({ name: '', email: ''});
        setTemplate(null);
        setSessionType(null);
    }
    
    const renderContent = () => {
        switch (flowState) {
            case 'SELECTING_SERVICE':
                return <ServiceSelection onSelect={handleServiceSelect} />;
            case 'ENTERING_DATA':
                return <DataEntry onSubmit={handleDataSubmit} isLoading={isLoading}/>;
            case 'PROCESSING_PAYMENT':
                return transaction && <PaymentFlow transaction={transaction} onPaymentSuccess={handlePaymentSuccess} isLoading={isLoading}/>;
            case 'WAITING_IN_QUEUE':
                return session && <WaitingForCertifier session={session} />;
            case 'LIVE_SESSION':
                return session && <LiveSessionView session={session} />;
            case 'COMPLETED':
                return session && <SuccessScreen session={session} onReset={handleReset}/>;
            default:
                return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
               {renderContent()}
            </div>
        </div>
    );
};

// Sub-components
const ServiceSelection: React.FC<{ onSelect: (type: SessionType, template: string) => void }> = ({ onSelect }) => (
    <div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Seleccione el Servicio</h2>
        <p className="text-center text-slate-500 mb-8">Elija el tipo de certificación que necesita.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => onSelect(SessionType.REN, 'Declaración Jurada')} className="p-6 border-2 border-slate-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">
                <FileText className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-lg">Certificación Asistida (REN)</h3>
                <p className="text-sm text-slate-600">Verificación biométrica en persona, con certificador remoto.</p>
            </button>
            <button onClick={() => onSelect(SessionType.RON, 'Contrato de Arriendo')} className="p-6 border-2 border-slate-200 rounded-lg text-left hover:border-green-500 hover:bg-green-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500">
                <Wifi className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-bold text-lg">Certificación Remota (RON)</h3>
                <p className="text-sm text-slate-600">Proceso 100% online con verificación en la llamada.</p>
            </button>
        </div>
    </div>
);

const DataEntry: React.FC<{ onSubmit: (data: {name: string, email: string}) => void, isLoading: boolean }> = ({onSubmit, isLoading}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    return (
        <div>
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Datos del Cliente</h2>
            <p className="text-center text-slate-500 mb-8">Por favor ingrese la información del firmante.</p>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, email }); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Correo Electrónico</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : 'Proceder al Pago'}
                    <ArrowRight className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

const PaymentFlow: React.FC<{ transaction: Transaction, onPaymentSuccess: () => void, isLoading: boolean }> = ({ transaction, onPaymentSuccess, isLoading }) => (
    <div className="text-center">
        <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Procesar Pago</h2>
        <p className="text-slate-500 mb-6">Por favor, complete el pago en el terminal físico.</p>
        <div className="bg-slate-100 p-6 rounded-lg mb-6">
            <p className="text-sm text-slate-600">Monto a Pagar</p>
            <p className="text-4xl font-bold text-slate-900">${transaction.amount.toFixed(2)}</p>
            <p className="mt-2 text-xs text-slate-500 font-mono">Voucher ID: {transaction.voucherId}</p>
        </div>
        <button onClick={onPaymentSuccess} disabled={isLoading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-400">
           {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : 'Confirmar Pago Exitoso'}
        </button>
    </div>
);

const WaitingForCertifier: React.FC<{ session: HybridSession }> = ({ session }) => (
    <div className="text-center">
        <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Esperando al Certificador</h2>
        <p className="text-slate-500 mb-6">Hemos recibido su solicitud. Estamos conectándolo con un certificador disponible.</p>
        <div className="bg-slate-100 p-6 rounded-lg">
            <p className="text-sm text-slate-600">ID de Sesión</p>
            <p className="text-3xl font-bold text-slate-900 font-mono">#{session.id}</p>
            <p className="mt-2 text-xs text-slate-500 font-mono">Voucher: {session.voucherId}</p>
        </div>
    </div>
);

const LiveSessionView: React.FC<{session: HybridSession}> = ({session}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApprove = async () => {
        setIsSubmitting(true);
        await api.approveDocument(session.id);
        setIsSubmitting(false);
    }
    
    const handleSign = async () => {
        setIsSubmitting(true);
        // In a real app, this would be base64 data from a canvas
        await api.submitClientPackage(session.id, 'mock_signature_data_base64');
        setIsSubmitting(false);
    }

    const renderActionPanel = () => {
        switch(session.status) {
            case SessionStatus.ACTIVE_CALL:
                return (
                    <div className="text-center p-4 bg-slate-100 rounded-b-lg">
                        <p className="font-medium text-slate-700">Esperando documento del certificador...</p>
                    </div>
                );
            case SessionStatus.CLIENT_APPROVAL:
                return (
                     <div className="border-t p-4 space-y-4">
                        <h3 className="font-bold text-lg text-center">Revisar Documento</h3>
                        <div className="prose prose-sm max-w-none h-40 overflow-y-auto border bg-white p-3 rounded-md" dangerouslySetInnerHTML={{ __html: session.documentContent || '' }} />
                        <button onClick={handleApprove} disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400">
                             {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : 'Aprobar Documento'}
                        </button>
                    </div>
                )
             case SessionStatus.PENDING_CLIENT_PACKAGE:
                return (
                    <div className="border-t p-4 space-y-4">
                        <h3 className="font-bold text-lg text-center">Verificación y Firma</h3>
                         <div className="bg-slate-50 border-dashed border-2 border-slate-300 rounded-lg h-32 mb-2 flex items-center justify-center text-slate-400">
                           <Edit className="w-6 h-6 mr-2"/> Signature Canvas
                        </div>
                        <label className="flex items-center space-x-2 text-sm text-slate-600">
                            <input type="checkbox" className="rounded border-slate-400 text-blue-600 focus:ring-blue-500"/>
                            <span>Acepto el contenido y confirmo mi firma.</span>
                        </label>
                        <button onClick={handleSign} disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-400">
                            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : 'Firmar y Aceptar'}
                        </button>
                    </div>
                )
             case SessionStatus.PENDING_FEA_SIGNATURE:
                return (
                    <div className="text-center p-4 bg-slate-100 rounded-b-lg">
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <p className="font-medium">Firma enviada. Finalizando...</p>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    }

    return (
        <div>
             <div className="bg-slate-800 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold">Sesión en Vivo con {session.certifierName}</h3>
                    <span className="text-xs bg-red-500 px-2 py-1 rounded-full animate-pulse">EN VIVO</span>
                </div>
            </div>
            <div className="bg-white text-slate-800 p-4 min-h-[200px] flex flex-col items-center justify-center">
                 <MessageSquare className="w-12 h-12 text-slate-300 mb-4"/>
                 <p className="text-slate-500">Siga las instrucciones del certificador.</p>
            </div>
            {renderActionPanel()}
        </div>
    )
};

const SuccessScreen: React.FC<{session: HybridSession, onReset: ()=>void}> = ({session, onReset}) => (
    <div className="text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Proceso Completado</h2>
        <p className="text-slate-500 mb-6">Su documento ha sido certificado exitosamente. Se ha enviado una copia a su correo.</p>
        <div className="bg-slate-100 p-6 rounded-lg mb-8">
            <p className="text-sm text-slate-600">Código de Verificación (Voucher)</p>
            <p className="text-4xl font-bold text-green-700 font-mono tracking-widest">{session.voucherId}</p>
            <a href={session.finalPdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-blue-600 hover:underline">Descargar Documento</a>
        </div>
        <button onClick={onReset} className="w-full py-3 px-4 rounded-lg bg-slate-600 text-white hover:bg-slate-700">
            Iniciar Nueva Sesión
        </button>
    </div>
);


export default PosTerminalPage;
