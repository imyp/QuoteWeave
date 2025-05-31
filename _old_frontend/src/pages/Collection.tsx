import {useParams} from 'react-router';

function Collection() {
  const {collectionId} = useParams();
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Collection Details</h1>
      <p className="text-lg mb-8">Collection ID: {collectionId}</p>
      <p className="text-sm text-gray-500">This page will display the details of the collection with ID: {collectionId}.</p>
    </div>
  );
}

export default Collection;