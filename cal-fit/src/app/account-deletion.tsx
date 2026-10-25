import { LegalDocument } from '@/components/LegalDocument';
import { ACCOUNT_DELETION } from '@/constants/legal';

export default function AccountDeletionScreen() {
  return <LegalDocument title="Delete Your Account" sections={ACCOUNT_DELETION} />;
}
