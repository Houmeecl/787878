export enum AppMode {
    POS = 'pos',
    CERTIFIER = 'certifier',
}

export enum SessionType {
    REN = 'ren',
    RON = 'ron',
}

export enum SessionStatus {
    PENDING_PAYMENT = 'pending_payment',
    PENDING_CERTIFIER = 'pending_certifier',
    ACTIVE_CALL = 'active_call',
    CLIENT_APPROVAL = 'client_approval', // Certifier sent doc, waiting for client OK
    PENDING_CLIENT_PACKAGE = 'pending_client_package', // Client approved, waiting for signature
    PENDING_FEA_SIGNATURE = 'pending_fea_signature', // Client signed, waiting for certifier FEA
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export interface Transaction {
    id: number;
    voucherId: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
}

export interface HybridSession {
    id: number;
    transactionId: number;
    voucherId: string;
    sessionType: SessionType;
    status: SessionStatus;
    clientName: string;
    clientEmail: string;
    templateName: string;
    certifierId?: number;
    certifierName?: string; // New
    livekitToken?: string;
    documentContent?: string; // New: To hold the certifier's text
    clientSignatureData?: string; // New: To hold the client's signature
    finalPdfUrl?: string;
}
