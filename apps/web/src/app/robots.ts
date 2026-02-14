import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: [
        '/admin/',
        '/promoter/',
        '/dashboard/',
        '/api/',
        '/join/',
        '/join-role/',
        '/role-select',
        '/checkout',
      ],
      allow: ['/', '/pricing', '/guide', '/p/'],
    },
  };
}
