import {useParams} from 'react-router';

function Quote() {
  const {quoteId} = useParams();
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Quote Details</h1>
      <p className="text-lg mb-8">Quote ID: {quoteId}</p>
      <p className="text-sm text-gray-500">This page will display the details of the quote with ID: {quoteId}.</p>
    </div>
  );
}

export default Quote;