import { Metadata } from 'next';
import { PublicAlbumView } from './PublicAlbumView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// 伺服器端取得相簿資料（用於 OG meta tags）
async function getAlbumData(slug: string) {
  try {
    const res = await fetch(`${API_URL}/public/albums/${slug}`, {
      next: { revalidate: 60 }, // 60 秒快取
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// 動態生成 OG meta tags（適合社群分享）
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const album = await getAlbumData(params.slug);

  if (!album) {
    return {
      title: '相簿不存在',
    };
  }

  const firstPhoto = album.photos?.[0];
  const description = album.description || `${album.campaignName} - ${album.photoCount} 張照片`;

  return {
    title: `${album.title} | ${album.campaignName}`,
    description,
    openGraph: {
      title: album.title,
      description,
      type: 'website',
      ...(firstPhoto && {
        images: [
          {
            url: firstPhoto.url,
            width: firstPhoto.width || 1200,
            height: firstPhoto.height || 630,
            alt: album.title,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: album.title,
      description,
      ...(firstPhoto && {
        images: [firstPhoto.url],
      }),
    },
  };
}

export default async function PublicAlbumPage({
  params,
}: {
  params: { slug: string };
}) {
  const album = await getAlbumData(params.slug);

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">相簿不存在</h1>
          <p className="text-muted-foreground">此相簿可能已被移除或尚未發表</p>
        </div>
      </div>
    );
  }

  return <PublicAlbumView album={album} />;
}
