import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineCallbackDto {
  @ApiProperty({ description: 'LINE 授權碼' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '重導向 URI' })
  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}
