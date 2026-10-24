import { LegalDocument } from '@/components/LegalDocument';
import { PRIVACY_POLICY } from '@/constants/legal';

export default function PrivacyScreen() {
  return <LegalDocument title="Privacy Policy" sections={PRIVACY_POLICY} />;
}
