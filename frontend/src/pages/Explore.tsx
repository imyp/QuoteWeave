import {useEffect, useState} from "react";
import {getQuotePage} from "../api";
import type { QuotePageEntry } from "../api";

const pageSize = 20

function Explore() {
  const [pageNumber, setPageNumber] = useState(1);
  const [entries, setEntries] = useState<QuotePageEntry[]>([]);
  useEffect(() => {
    async function fetchData() {
      try {
        const content = await getQuotePage({page_number: pageNumber});
        setEntries(content.quotes);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, [pageNumber]);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <table className="table w-xl mt-4">
        <thead>
          <tr>
            <th></th>
            <th>Quote</th>
            <th>Author</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <th className="truncate w-20">{index + 1 + pageSize * (pageNumber - 1)}</th>
              <td className="flex truncate w-lg">{entry.quote_text}</td>
              <td className="truncate w-20">{entry.author_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="btn-group mt-4">
        <button className="btn btn-neutral" onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))} disabled={pageNumber <= 1}>Previous</button>
        <span className="btn btn-neutral">{pageNumber}</span>
        <button className="btn btn-neutral" onClick={() => setPageNumber(prev => prev + 1)}>Next</button>
      </div>
    </div>
  );
}

export default Explore;