'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthorCard } from '@/components/author-card';
import { AuthorSearch } from '@/components/author-search';
import { getAuthors, AuthorEntry, PaginatedAuthorsResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 12;

export default function AuthorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const fetchAuthors = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const response: PaginatedAuthorsResponse = await getAuthors(search, ITEMS_PER_PAGE, skip);
      setAuthors(response.authors);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch authors:", error);
      toast.error("Failed to load authors", { description: error instanceof Error ? error.message : "Please try again later." });
      setAuthors([]);
      setTotalPages(0);
      setTotalItems(0);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAuthors(1, searchTerm);
  }, [searchTerm, fetchAuthors]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchAuthors(newPage, searchTerm);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center text-primary">Discover Authors</h1>
        <p className="text-lg text-center text-muted-foreground mt-2">Explore and connect with talented authors.</p>
      </header>

      <div className="mb-8 flex justify-center">
        <AuthorSearch onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">Loading authors...</p>
        </div>
      ) : authors.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {authors.map(author => (
              <AuthorCard key={author.id} author={{ ...author, username: author.name }} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center space-x-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing {authors.length} of {totalItems} authors
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 dark:text-gray-400">
            {searchTerm ? `No authors found matching "${searchTerm}".` : "No authors found."}
          </p>
        </div>
      )}
    </div>
  );
}