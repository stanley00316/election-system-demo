'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { albumsApi } from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// 社群平台 SVG 圖示（與 ShareButtons 一致）
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.264 1.33-3.084.89-.792 2.14-1.28 3.726-1.456.946-.104 1.9-.086 2.818.049-.059-.477-.2-.9-.422-1.263-.357-.583-.93-.903-1.702-.952-1.155-.072-2.063.345-2.273.66l-1.752-1.19c.68-1.006 2.07-1.65 3.63-1.573 1.38.068 2.479.566 3.175 1.44.608.763.958 1.79 1.044 3.054l.006.117c.94.456 1.688 1.103 2.215 1.94.824 1.306 1.098 2.978.771 4.707C20.964 21.383 18.244 24 12.186 24zm1.638-8.178c-.642.017-1.17.15-1.564.395-.453.284-.688.653-.662 1.04.037.585.628.984 1.476.996.969-.028 1.728-.412 2.258-1.14.343-.473.583-1.066.723-1.773-.71-.147-1.46-.234-2.204-.25l-.027-.268z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

interface SetupStep {
  step: number;
  title: string;
  description: string;
  url?: string;
}

interface PlatformConfig {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  docsUrl: string;
  envVars: string[];
  setupSteps: SetupStep[];
  warnings?: string[];
}

const platforms: PlatformConfig[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    icon: <FacebookIcon className="h-6 w-6" />,
    color: '#1877F2',
    description: '自動發佈相簿到 Facebook 粉絲專頁。需要建立 Facebook App 並取得粉絲專頁的 Page Access Token。',
    docsUrl: 'https://developers.facebook.com/docs/pages-api/posts',
    envVars: ['FACEBOOK_APP_ID', 'FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
    setupSteps: [
      { step: 1, title: '建立 Facebook App', description: '前往 Meta for Developers 建立新的應用程式，選擇「商業」類型。', url: 'https://developers.facebook.com/apps/' },
      { step: 2, title: '設定粉絲專頁權限', description: '在 App Dashboard 中新增「Pages API」產品，並綁定要發佈的粉絲專頁。' },
      { step: 3, title: '取得 Page Access Token', description: '使用 Graph API Explorer 產生粉絲專頁的永久存取權杖（需 pages_manage_posts 權限）。', url: 'https://developers.facebook.com/tools/explorer/' },
      { step: 4, title: '設定環境變數', description: '將 FACEBOOK_APP_ID、FACEBOOK_PAGE_ID、FACEBOOK_PAGE_ACCESS_TOKEN 設定到後端環境變數中。' },
    ],
    warnings: ['Page Access Token 建議使用永久權杖（Long-lived Token），避免過期。'],
  },
  {
    key: 'line',
    name: 'LINE',
    icon: <LineIcon className="h-6 w-6" />,
    color: '#06C755',
    description: '透過 LINE Messaging API 廣播相簿卡片給所有好友。需要設定 LINE Messaging API 的 Channel Access Token。',
    docsUrl: 'https://developers.line.biz/en/docs/messaging-api/',
    envVars: ['LINE_MESSAGING_ACCESS_TOKEN'],
    setupSteps: [
      { step: 1, title: '建立 LINE Messaging API Channel', description: '前往 LINE Developers Console 建立新的 Messaging API Channel。', url: 'https://developers.line.biz/console/' },
      { step: 2, title: '取得 Channel Access Token', description: '在 Channel 設定頁面的「Messaging API」分頁中，發行 Long-lived Channel Access Token。' },
      { step: 3, title: '設定環境變數', description: '將 LINE_MESSAGING_ACCESS_TOKEN 設定到後端環境變數中。' },
    ],
    warnings: ['LINE Messaging API 的免費方案每月有訊息數量上限（目前約 500 則）。'],
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    icon: <XIcon className="h-6 w-6" />,
    color: '#000000',
    description: '自動發推文到 X (Twitter) 帳號。需要建立 Twitter Developer App 並取得 OAuth 1.0a 憑證。',
    docsUrl: 'https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/introduction',
    envVars: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
    setupSteps: [
      { step: 1, title: '申請 X Developer 帳號', description: '前往 X Developer Portal 申請開發者帳號（需通過審核）。', url: 'https://developer.x.com/en/portal/dashboard' },
      { step: 2, title: '建立 App', description: '在 Developer Portal 建立新的 App，取得 API Key 和 API Secret。' },
      { step: 3, title: '產生 Access Token', description: '在 App 設定中產生 Access Token 和 Access Token Secret（需設定為 Read and Write 權限）。' },
      { step: 4, title: '設定環境變數', description: '將 X_API_KEY、X_API_SECRET、X_ACCESS_TOKEN、X_ACCESS_TOKEN_SECRET 設定到後端環境變數中。' },
    ],
    warnings: ['X API v2 Free tier 每月只能發 1,500 則推文。'],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: <InstagramIcon className="h-6 w-6" />,
    color: '#E4405F',
    description: '自動發佈照片到 Instagram Business 帳號。透過 Facebook Graph API 操作，需要完成 Facebook Business 審核。',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing/',
    envVars: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
    setupSteps: [
      { step: 1, title: '轉換為商業帳號', description: '確保 Instagram 帳號已轉換為商業帳號（Business Account），並已連結 Facebook 粉絲專頁。' },
      { step: 2, title: '取得 Instagram Business Account ID', description: '使用 Graph API Explorer 查詢連結的 Instagram Business Account ID。', url: 'https://developers.facebook.com/tools/explorer/' },
      { step: 3, title: '設定環境變數', description: '將 FACEBOOK_PAGE_ACCESS_TOKEN 和 INSTAGRAM_BUSINESS_ACCOUNT_ID 設定到後端環境變數中。' },
    ],
    warnings: ['Instagram Content Publishing API 需要 App 通過 Facebook 商業審核。', '發佈的照片必須是公開可存取的 URL。'],
  },
  {
    key: 'threads',
    name: 'Threads',
    icon: <ThreadsIcon className="h-6 w-6" />,
    color: '#000000',
    description: '自動發佈文字貼文到 Threads。使用 Meta Threads API（Graph API）發佈含連結的文字內容。',
    docsUrl: 'https://developers.facebook.com/docs/threads/posts',
    envVars: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'],
    setupSteps: [
      { step: 1, title: '建立 Meta App', description: '前往 Meta for Developers 建立 App 並啟用 Threads API 產品。', url: 'https://developers.facebook.com/apps/' },
      { step: 2, title: '取得使用者授權', description: '完成 OAuth 流程取得 User Access Token（需 threads_basic、threads_content_publish 權限）。' },
      { step: 3, title: '取得 User ID', description: '使用 Threads API 的 /me 端點取得你的 Threads User ID。' },
      { step: 4, title: '設定環境變數', description: '將 THREADS_ACCESS_TOKEN 和 THREADS_USER_ID 設定到後端環境變數中。' },
    ],
    warnings: ['Threads API 尚在持續開發中，部分功能可能有變動。', 'Access Token 需定期更新。'],
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: <TikTokIcon className="h-6 w-6" />,
    color: '#000000',
    description: '透過 TikTok Content Posting API 發佈圖片貼文到 TikTok。需要 TikTok Developer App 帳號。',
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
    envVars: ['TIKTOK_ACCESS_TOKEN'],
    setupSteps: [
      { step: 1, title: '註冊 TikTok Developer 帳號', description: '前往 TikTok for Developers 註冊開發者帳號。', url: 'https://developers.tiktok.com/' },
      { step: 2, title: '建立 App', description: '建立新的 App 並申請 Content Posting API 權限（需通過審核）。' },
      { step: 3, title: '取得 Access Token', description: '完成 OAuth 2.0 授權流程取得使用者的 Access Token。' },
      { step: 4, title: '設定環境變數', description: '將 TIKTOK_ACCESS_TOKEN 設定到後端環境變數中。' },
    ],
    warnings: ['TikTok 發佈 API 需要照片為公開可存取的 URL。', '相簿需至少包含一張照片才能分享。'],
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: <YouTubeIcon className="h-6 w-6" />,
    color: '#FF0000',
    description: '自動發佈社群貼文到 YouTube 頻道。使用 YouTube Data API v3 建立頻道社群公告。',
    docsUrl: 'https://developers.google.com/youtube/v3/docs',
    envVars: ['YOUTUBE_ACCESS_TOKEN', 'YOUTUBE_CHANNEL_ID'],
    setupSteps: [
      { step: 1, title: '建立 Google Cloud 專案', description: '前往 Google Cloud Console 建立專案並啟用 YouTube Data API v3。', url: 'https://console.cloud.google.com/' },
      { step: 2, title: '設定 OAuth 2.0 憑證', description: '在 API 與服務 > 憑證中建立 OAuth 2.0 用戶端 ID。' },
      { step: 3, title: '取得 Access Token', description: '完成 OAuth 2.0 授權流程並取得具有 youtube.force-ssl 範圍的 Access Token。' },
      { step: 4, title: '設定環境變數', description: '將 YOUTUBE_ACCESS_TOKEN 和 YOUTUBE_CHANNEL_ID 設定到後端環境變數中。' },
    ],
    warnings: ['YouTube 社群貼文功能需要頻道有 500 位以上訂閱者。', 'Access Token 有效期短，建議搭配 Refresh Token 使用。'],
  },
  {
    key: 'telegram',
    name: 'Telegram',
    icon: <TelegramIcon className="h-6 w-6" />,
    color: '#26A5E4',
    description: '透過 Telegram Bot API 自動傳送相簿照片與訊息到指定頻道或群組。',
    docsUrl: 'https://core.telegram.org/bots/api',
    envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID'],
    setupSteps: [
      { step: 1, title: '建立 Telegram Bot', description: '在 Telegram 中與 @BotFather 對話，使用 /newbot 指令建立新的 Bot。', url: 'https://t.me/BotFather' },
      { step: 2, title: '取得 Bot Token', description: 'BotFather 會提供一組 Bot Token，格式如 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11。' },
      { step: 3, title: '將 Bot 加入頻道', description: '將建立的 Bot 加入你要發佈的 Telegram 頻道，並設為管理員。' },
      { step: 4, title: '取得 Channel ID', description: '頻道的 Chat ID 可使用 @username 格式（如 @mychannel），或使用 API 取得數字 ID。' },
      { step: 5, title: '設定環境變數', description: '將 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHANNEL_ID 設定到後端環境變數中。' },
    ],
    warnings: ['Bot 必須是頻道的管理員才能發送訊息。'],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon: <WhatsAppIcon className="h-6 w-6" />,
    color: '#25D366',
    description: '透過 WhatsApp Business Cloud API 發送相簿訊息。需要 Meta Business 帳號與 WhatsApp Business API 設定。',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages',
    envVars: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_BROADCAST_GROUP_ID'],
    setupSteps: [
      { step: 1, title: '設定 WhatsApp Business 帳號', description: '前往 Meta Business Suite 建立或連結 WhatsApp Business 帳號。', url: 'https://business.facebook.com/' },
      { step: 2, title: '啟用 Cloud API', description: '在 Meta for Developers 建立 App 並新增 WhatsApp 產品，取得測試用電話號碼 ID。', url: 'https://developers.facebook.com/apps/' },
      { step: 3, title: '取得 Access Token', description: '在 App Dashboard 的 WhatsApp 設定頁面產生 System User Access Token。' },
      { step: 4, title: '設定廣播群組', description: '建立 WhatsApp 廣播群組並取得其 ID，用於群發訊息。' },
      { step: 5, title: '設定環境變數', description: '將 WHATSAPP_PHONE_NUMBER_ID、WHATSAPP_ACCESS_TOKEN 和 WHATSAPP_BROADCAST_GROUP_ID 設定到後端環境變數中。' },
    ],
    warnings: ['WhatsApp Business API 不支援大量群發，需先與使用者建立對話。', '訊息範本需通過 Meta 審核。'],
  },
];

function SetupStepsPanel({ platform }: { platform: PlatformConfig }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t pt-3 mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-full text-left"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        設定步驟教學
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          <ol className="space-y-3">
            {platform.setupSteps.map((s) => (
              <li key={s.step} className="flex gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      前往設定
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {platform.warnings && platform.warnings.length > 0 && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 space-y-1">
              {platform.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-800 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SocialSettingsPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['social-status'],
    queryFn: () => albumsApi.getSocialStatus(),
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">社群帳號設定</h1>
          <p className="text-muted-foreground">
            連結社群平台帳號，啟用自動發佈相簿功能（共支援 {platforms.length} 個平台）
          </p>
        </div>
      </div>

      {/* 說明 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <p className="font-medium">設定方式</p>
              <p className="text-sm text-muted-foreground mt-1">
                社群平台 API 金鑰需由系統管理員在後端環境變數中設定。設定完成後，您即可從相簿詳情頁直接發佈到各平台。
                若僅需分享連結（不需要 API 金鑰），請至相簿詳情頁使用「分享按鈕」功能。
                點擊每個平台卡片下方的「設定步驟教學」可查看詳細設定說明。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 平台列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const isConnected = status?.[platform.key] ?? false;

          return (
            <Card key={platform.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${platform.color}15`,
                        color: platform.color,
                      }}
                    >
                      {platform.icon}
                    </div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                  <Badge
                    variant={isConnected ? 'default' : 'secondary'}
                    className={
                      isConnected
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : ''
                    }
                  >
                    {isLoading ? (
                      '檢查中...'
                    ) : isConnected ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        已連結
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        未設定
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription>{platform.description}</CardDescription>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    需要的環境變數：
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {platform.envVars.map((v) => (
                      <code
                        key={v}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>

                <a
                  href={platform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="mt-2">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    查看文件
                  </Button>
                </a>

                {/* 管理員設定步驟教學 */}
                <SetupStepsPanel platform={platform} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
