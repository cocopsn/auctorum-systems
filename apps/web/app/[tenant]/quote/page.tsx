import QuoteForm from '../../../components/quote/QuoteForm';

interface QuotePageProps {
  params: { tenant: string };
}

export default function QuotePage({ params }: QuotePageProps) {
  return <QuoteForm tenantSlug={params.tenant} />;
}
