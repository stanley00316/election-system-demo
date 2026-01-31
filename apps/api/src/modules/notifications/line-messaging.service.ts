import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LineMessage {
  type: 'text' | 'flex' | 'template';
  text?: string;
  altText?: string;
  contents?: any;
  template?: any;
}

@Injectable()
export class LineMessagingService {
  private readonly accessToken: string;
  private readonly apiUrl = 'https://api.line.me/v2/bot/message';

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get('LINE_MESSAGING_ACCESS_TOKEN', '');
  }

  // 發送推播訊息
  async sendPushMessage(to: string, message: string | LineMessage) {
    if (!this.accessToken) {
      console.warn('LINE Messaging API access token not configured');
      return;
    }

    const messages = typeof message === 'string'
      ? [{ type: 'text', text: message }]
      : [message];

    try {
      const response = await fetch(`${this.apiUrl}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ to, messages }),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        console.error('LINE push message failed:', errorData);
        throw new Error(errorData.message || 'LINE push message failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send LINE push message:', error);
      throw error;
    }
  }

  // 發送多播訊息（給多個使用者）
  async sendMulticastMessage(to: string[], message: string | LineMessage) {
    if (!this.accessToken) {
      console.warn('LINE Messaging API access token not configured');
      return;
    }

    const messages = typeof message === 'string'
      ? [{ type: 'text', text: message }]
      : [message];

    try {
      const response = await fetch(`${this.apiUrl}/multicast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ to, messages }),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        console.error('LINE multicast message failed:', errorData);
        throw new Error(errorData.message || 'LINE multicast message failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send LINE multicast message:', error);
      throw error;
    }
  }

  // 發送 Flex Message（豐富卡片訊息）
  async sendFlexMessage(to: string, altText: string, contents: any) {
    return this.sendPushMessage(to, {
      type: 'flex',
      altText,
      contents,
    });
  }

  // 建立選民卡片訊息
  createVoterCard(voter: {
    name: string;
    phone?: string;
    address?: string;
    stance: string;
    influenceScore: number;
  }) {
    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: voter.name,
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '傾向',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: voter.stance,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 3,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '影響力',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${voter.influenceScore} 分`,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 3,
                  },
                ],
              },
              voter.address
                ? {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '地址',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1,
                      },
                      {
                        type: 'text',
                        text: voter.address,
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 3,
                      },
                    ],
                  }
                : null,
            ].filter(Boolean),
          },
        ],
      },
    };
  }
}
