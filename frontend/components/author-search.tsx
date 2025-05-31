'use client';

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

interface AuthorSearchProps {
  onSearch: (searchTerm: string) => void;
}

export function AuthorSearch({ onSearch }: AuthorSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="text"
        placeholder="Search authors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-grow"
      />
      <Button type="button" onClick={handleSearch} aria-label="Search Authors">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </div>
  );
}