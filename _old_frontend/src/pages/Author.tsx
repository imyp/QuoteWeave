import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getAuthorInfo, type AuthorResponse } from "../api";
import { NavLink } from "react-router";

function Author() {
  const { authorId } = useParams<{ authorId: string }>();
  const parsedAuthorId = parseInt(authorId || "", 10);
  const [authorInfo, setAuthorInfo] = useState<AuthorResponse | null>(null);

  useEffect(() => {
    if (authorId) {
      getAuthorInfo(parsedAuthorId)
        .then((authorInfo) => {
          setAuthorInfo(authorInfo);
        })
        .catch((error) => {
          console.error("Error fetching author info:", error);
        });
    }
  }, [authorId]);

  if (authorInfo === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold mb-4">Loading author info...</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Display card with user name and statistics */}
      <div className="card w-xl bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h1 className="text-3xl font-bold mb-2">{authorInfo.name}</h1>
          <p className="text-lg text-neutral-500">
            Quotes Created: {authorInfo.quotes.length}
          </p>
          <p className="text-lg text-neutral-500">
            Collections Created: {authorInfo.collections.length}
          </p>
        </div>
      </div>
      {/* Display quotes created by the author */}
      <ul className="list w-xl bg-base-100 rounded-box shadow-md">
        <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">
          Quotes
        </li>
        {authorInfo.quotes.map((quote) => (
          <li key={quote.id} className="list-row">
            <NavLink to={`/quotes/${quote.id}`} className="truncate">{quote.text}</NavLink>
          </li>
          ))
        }
        { authorInfo.quotes.length === 0 && (
          <li className="list-row">
            <span className="text-gray-500">No quotes created by this author.</span>
            </li>
        )}
      </ul>
      {/* Display collections created by the author */}
      <ul className="list w-xl bg-base-100 rounded-box shadow-md mt-4">
        <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">
          Collections
        </li>
        {authorInfo.collections.map((collection) => (
          <li key={collection.id} className="list-row">
            <NavLink to={`/collections/${collection.id}`} className="truncate">{collection.name}</NavLink>
          </li>
        ))}
        { authorInfo.collections.length === 0 && (
          <li className="list-row">
            <span className="text-gray-500">No collections created by this author.</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default Author;
