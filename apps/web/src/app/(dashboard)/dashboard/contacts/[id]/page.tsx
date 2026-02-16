'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { contactsApi, votersApi } from '@/lib/api';
import {
  formatDate,
  formatRelativeTime,
  getContactTypeLabel,
  getContactOutcomeLabel,
} from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  MessageSquare,
  User,
  Clock,
  Tag,
  Edit,
  Trash2,
  Phone,
  Home,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useState } from 'react';
import { EditContactDialog } from '@/components/contacts/EditContactDialog';
import { DeleteContactDialog } from '@/components/contacts/DeleteContactDialog';
import { usePermissions } from '@/hooks/use-permissions';

const CONTACT_TYPE_ICONS: Record<string, React.ElementType> = {
  HOME_VISIT: Home,
  PHONE_CALL: Phone,
  LIVING_ROOM: Users,
  default: MessageSquare,
};

const OUTCOME_STYLES: Record<string, string> = {
  POSITIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  NEUTRAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  NEGATIVE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NO_RESPONSE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  NOT_HOME: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contactId = params.id as string;
  const { canEditContact, canDeleteContact } = usePermissions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getById(contactId),
    enabled: !!contactId,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">找不到接觸紀錄</p>
            <p className="text-muted-foreground mt-1">此紀錄可能已被刪除</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/dashboard/contacts')}
            >
              返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = CONTACT_TYPE_ICONS[contact.type] || CONTACT_TYPE_ICONS.default;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/contacts" />
          <div>
            <h1 className="text-2xl font-bold">接觸紀錄詳情</h1>
            <p className="text-muted-foreground">
              {formatRelativeTime(contact.contactDate)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditContact && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              編輯
            </Button>
          )}
          {canDeleteContact && (
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              刪除
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getContactTypeLabel(contact.type)}
                  <Badge className={OUTCOME_STYLES[contact.outcome]}>
                    {getContactOutcomeLabel(contact.outcome)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {formatDate(contact.contactDate, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notes */}
            {contact.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">備註</h3>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            {/* Topics */}
            {contact.topics?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  <Tag className="h-4 w-4 inline mr-1" />
                  討論主題
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.topics.map((topic: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {contact.location && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  地點
                </h3>
                <p className="text-sm">{contact.location}</p>
              </div>
            )}

            {/* Follow up */}
            {(contact.nextAction || contact.followUpDate) && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-medium mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  待追蹤
                </h3>
                {contact.nextAction && (
                  <p className="text-sm">{contact.nextAction}</p>
                )}
                {contact.followUpDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    追蹤日期：{formatDate(contact.followUpDate, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Recorder */}
            {contact.user && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">記錄者</h3>
                <p className="text-sm">{contact.user.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voter Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <User className="h-4 w-4 inline mr-1" />
              選民資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contact.voter ? (
              <div className="space-y-4">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/voters/${contact.voter.id}`)}
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-medium">
                      {contact.voter.name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{contact.voter.name}</p>
                    <p className="text-sm text-muted-foreground">
                      點擊查看詳情
                    </p>
                  </div>
                </div>

                {contact.voter.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.voter.phone}</span>
                  </div>
                )}

                {contact.voter.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.voter.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">無選民資訊</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {editOpen && (
        <EditContactDialog
          contact={contact}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteOpen && (
        <DeleteContactDialog
          contactId={contactId}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onSuccess={() => {
            router.push('/dashboard/contacts');
          }}
        />
      )}
    </div>
  );
}
