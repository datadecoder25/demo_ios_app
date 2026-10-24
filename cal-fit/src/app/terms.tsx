import { LegalDocument } from '@/components/LegalDocument';
import { TERMS_OF_USE } from '@/constants/legal';

export default function TermsScreen() {
  return <LegalDocument title="Terms of Use" sections={TERMS_OF_USE} />;
}
