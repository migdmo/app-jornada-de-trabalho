export interface ReviewAdjustmentRequestDto {
  decision: 'APPROVED' | 'REJECTED';
  comment?: string | null;        // obrigatório na rejeição
}