import { HybridSession, SessionStatus, SessionType, Transaction } from '../types';

// In-memory database
let sessions: HybridSession[] = [];
let transactions: Transaction[] = [];
let nextSessionId = 1;
let nextTransactionId = 1;

// Mock certifiers
const CERTIFIERS: Record<number, { id: number, name: string }> = {
    1: { id: 1, name: "Ana Rojas" },
    2: { id: 2, name: "Carlos Soto" },
};

const nanoid = (size = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper to find and update a session
const updateSession = (sessionId: number, updates: Partial<HybridSession>): HybridSession | null => {
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex > -1) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
        console.log(`API: Session ${sessionId} updated`, sessions[sessionIndex]);
        return sessions[sessionIndex];
    }
    return null;
}

export const api = {
    initiateTransaction: async (templateName: string, sessionType: SessionType): Promise<Transaction> => {
        await new Promise(res => setTimeout(res, 500));
        const amount = templateName === 'Declaración Jurada' ? 15.00 : 25.00;
        const newTransaction: Transaction = {
            id: nextTransactionId++,
            voucherId: nanoid(8),
            amount,
            status: 'pending',
        };
        transactions.push(newTransaction);
        console.log('API: Transaction initiated', newTransaction);
        return newTransaction;
    },

    confirmPayment: async (transactionId: number, clientName: string, clientEmail: string, templateName: string, sessionType: SessionType): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 1000));
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) throw new Error('Transaction not found');
        transaction.status = 'completed';

        const newSession: HybridSession = {
            id: nextSessionId++,
            transactionId,
            voucherId: transaction.voucherId,
            sessionType,
            status: SessionStatus.PENDING_CERTIFIER,
            clientName,
            clientEmail,
            templateName,
            documentContent: `Este es el contenido base para el documento: ${templateName}. Por favor, revise y confirme los detalles con el cliente.`
        };
        sessions.push(newSession);
        
        console.log('API: Payment confirmed, session created', newSession);
        return newSession;
    },

    getSessionStatus: async (sessionId: number): Promise<HybridSession | null> => {
        await new Promise(res => setTimeout(res, 300));
        const session = sessions.find(s => s.id === sessionId);
        return session || null;
    },

    getCertifierQueue: async (): Promise<HybridSession[]> => {
        await new Promise(res => setTimeout(res, 500));
        return sessions.filter(s => s.status === SessionStatus.PENDING_CERTIFIER) || [];
    },

    acceptSession: async (sessionId: number, certifierId: number): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 1000));
        const certifier = CERTIFIERS[certifierId];
        if (!certifier) throw new Error("Certifier not found");

        const updatedSession = updateSession(sessionId, {
            status: SessionStatus.ACTIVE_CALL,
            certifierId: certifierId,
            certifierName: certifier.name,
            livekitToken: `mock_token_for_session_${sessionId}`
        });
        
        if (!updatedSession) throw new Error('Session not found');
        return updatedSession;
    },
    
    sendDocumentForReview: async(sessionId: number, documentContent: string): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 500));
        const updatedSession = updateSession(sessionId, {
            documentContent,
            status: SessionStatus.CLIENT_APPROVAL
        });
        if (!updatedSession) throw new Error('Session not found');
        return updatedSession;
    },

    approveDocument: async(sessionId: number): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 500));
        const updatedSession = updateSession(sessionId, {
            status: SessionStatus.PENDING_CLIENT_PACKAGE
        });
        if (!updatedSession) throw new Error('Session not found');
        return updatedSession;
    },

    submitClientPackage: async(sessionId: number, signatureData: string): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 1000));
         const updatedSession = updateSession(sessionId, {
            clientSignatureData: signatureData,
            status: SessionStatus.PENDING_FEA_SIGNATURE
        });
        if (!updatedSession) throw new Error('Session not found');
        return updatedSession;
    },

    finalizeSession: async(sessionId: number): Promise<HybridSession> => {
        await new Promise(res => setTimeout(res, 2000));
        const session = sessions.find(s => s.id === sessionId);
        if(!session) throw new Error('Session not found');

        const updatedSession = updateSession(sessionId, {
            status: SessionStatus.COMPLETED,
            finalPdfUrl: `/docs/certified-${session.voucherId}.pdf`,
        });

        if (!updatedSession) throw new Error('Session not found');
        
        console.log(`Email Service: Sending document for voucher ${updatedSession.voucherId} to ${updatedSession.clientEmail}`);

        return updatedSession;
    }
};
