import { redirect } from 'next/navigation';

export default function CollectionsRedirectPage() {
  redirect('/collections/page/1');
  // return null; // Or a loading spinner, though redirect is usually fast
}