import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ApplyReferralDto {
  @IsString()
  @IsNotEmpty({ message: '請輸入推薦碼' })
  @Length(6, 10, { message: '推薦碼長度應為 6-10 個字元' })
  referralCode: string;
}
