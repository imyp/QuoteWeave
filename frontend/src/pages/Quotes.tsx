import {useState, useEffect, useMemo} from "react";
import {getQuotePage, getQuoteTotalPages, type QuotePageEntry } from "../api";
import { ErrorBoundary } from "react-error-boundary";
import { NavLink, useNavigate, useParams } from "react-router";

function QuoteEntry({entry}: {entry: QuotePageEntry}) {
  const [expanded, setExpanded] = useState(false);
  const limit = 200; // Character limit for truncation
  const isTruncatable = entry.quote_text.length > limit;
  const truncatedText = isTruncatable ? entry.quote_text.slice(0, limit) + "..." : entry.quote_text;
  return (
    <div className="card w-xl bg-base-100 shadow-xl mb-4">
    <div className="card-body">
      <div className="flex justify-between items-center mb-2">
        <NavLink to={`/authors/${entry.author_id}`}>
          <span className="font-extrabold text-lg text-neutral-400">@{entry.author_name}</span>
        </NavLink>
      </div>
      <p className="text-2xl font-bold">{expanded ? entry.quote_text : truncatedText }</p>
      { isTruncatable && (
      <button
        className="btn btn-link mt-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Show Less" : "Show More"}
      </button>)
      }
      </div>
    </div>
  );
}

function getPageIndices(currentPage: number, totalPages: number, surrounding: number = 2) {
  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);
  for (let i = currentPage - surrounding; i <= currentPage + surrounding; i++) {
    if (i > 1 && i < totalPages) {
      pages.add(i);
    }
  }
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
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
      const response = await getQuotePage({page_number: pageNumber});
      setEntries(response.quotes);
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

function Quotes() {
  const { pageNumber } = useParams<{ pageNumber: string }>();
  const navigate = useNavigate();
  const pageNumberInt = parseInt(pageNumber || "1", 10);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    async function fetchTotalPages() {
      const response = await getQuoteTotalPages();
      setTotalPages(response.n_pages);
    }
    fetchTotalPages();
  }, []);
  const pageIndices = useMemo(() => getPageIndices(pageNumberInt, totalPages), [pageNumber, totalPages]);
  return (
    <div className="flex flex-col items-center justify-center">
      <ErrorBoundary fallback={<div className="alert alert-error">Failed to load quotes. Please try again later.</div>}>
        <QuotePageTable pageNumber={pageNumberInt} />
      </ErrorBoundary>
      <div className="join">
        {pageIndices.map((value, index) => (
          <button
            key={index}
            className={`join-item btn ${value === pageNumber ? 'btn-active' : value === "..." ? 'btn-disabled' : ''}`}
            onClick={(typeof value) == "number" ? () => navigate(`/quotes/page/${value}`) : undefined}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
    
  );
}

export default Quotes;