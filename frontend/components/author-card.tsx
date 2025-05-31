import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface AuthorCardProps {
  author: {
    id: number;
    username: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Card className="w-[350px]">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.username} />}
          <AvatarFallback>{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{author.username}</CardTitle>
        </div>
      </CardHeader>
      {author.bio && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{author.bio}</p>
        </CardContent>
      )}
      <CardFooter className="flex justify-end">
        <Link href={`/authors/${author.id}`} passHref>
          <Button variant="outline">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}