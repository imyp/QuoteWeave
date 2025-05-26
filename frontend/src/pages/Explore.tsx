import {useState, useEffect, useMemo} from "react";
import {getQuotePage, getQuoteTotalPages, type QuotePageEntry } from "../api";
import { ErrorBoundary } from "react-error-boundary";

function QuoteEntry({entry}: {entry: QuotePageEntry}) {
  const [expanded, setExpanded] = useState(false);
  const truncatedText = entry.quote_text.length > 200 ? entry.quote_text.slice(0, 100) + "..." : entry.quote_text;
  return (
    <div className="card w-xl bg-base-100 shadow-xl mb-4">
    <div className="card-body">
      <div className="flex justify-between items-center mb-2">
        <span className="font-extrabold text-lg text-neutral-400">@{entry.author_name}</span>
      </div>
      <p className="text-2xl font-bold">{expanded ? entry.quote_text : truncatedText }</p>
      <button
        className="btn btn-link mt-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Show Less" : "Show More"}
      </button>
      </div>
    </div>
  );
}

function getPageIndices(currentPage: number, totalPages: number, surrounding: number = 2) {
  const pages = new Set<number>();

  // Always show first and last pages
  pages.add(1);
  pages.add(totalPages);

  // Add surrounding pages around currentPage
  for (let i = currentPage - surrounding; i <= currentPage + surrounding; i++) {
    if (i > 1 && i < totalPages) {
      pages.add(i);
    }
  }

  // Convert to array and sort
  const sortedPages = Array.from(pages).sort((a, b) => a - b);

  // Insert ellipses where needed
  const result = [];
  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    if (i === 0) {
      result.push(page);
    } else {
      const prev = sortedPages[i - 1];
      if (page - prev === 1) {
        result.push(page);
      } else {
        result.push("...", page);
      }
    }
  }
  return result;
}


function QuotePageTable({pageNumber}: {pageNumber: number}) {
  const [entries, setEntries] = useState<QuotePageEntry[]>([]);
  const fetchEntries = useMemo(() => {
    return async () => {
      try {
        const response = await getQuotePage({page_number: pageNumber});
        console.log("Fetched entries:", response);
        setEntries(response.quotes);
      } catch (error) {
        console.error("Failed to fetch entries:", error);
        throw error; // This will trigger the ErrorBoundary
      }
    };
  }, [pageNumber]);
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);
  return (
    <>
    {entries.map((entry) => (
      <QuoteEntry key={entry.quote_id} entry={entry} />
    ))}
    </>
  );
}

function Explore() {
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    async function fetchTotalPages() {
      try {
        const response = await getQuoteTotalPages();
        console.log("Total pages response:", response);
        setTotalPages(response.n_pages);
        if (pageNumber > response.n_pages) {
          setPageNumber(response.n_pages);
        }
      } catch (error) {
        console.error("Failed to fetch total pages:", error);
      }
    }
    fetchTotalPages();
  }, []);
  const pageIndices = useMemo(() => getPageIndices(pageNumber, totalPages), [pageNumber, totalPages]);
  return (
    <div className="flex flex-col items-center justify-center">
      <ErrorBoundary fallback={<div className="alert alert-error">Failed to load quotes. Please try again later.</div>}>
        <QuotePageTable pageNumber={pageNumber} />
      </ErrorBoundary>
      <div className="join">
        {pageIndices.map((value, index) => (
          <button
            key={index}
            className={`join-item btn ${value === pageNumber ? 'btn-active' : value === "..." ? 'btn-disabled' : ''}`}
            onClick={() => setPageNumber(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
    
  );
}

export default Explore;