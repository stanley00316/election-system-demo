import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M11 8v4" />
              <path d="M11 16h.01" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-lg font-medium">找不到頁面</p>
            <p className="text-muted-foreground text-sm">
              您要找的頁面不存在或已被移除。
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            回首頁
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
