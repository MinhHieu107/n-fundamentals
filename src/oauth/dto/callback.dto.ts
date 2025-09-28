import { IsNotEmpty, IsString } from 'class-validator';

export class CallbackQueryDto {
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  code: string;

  @IsString()
  state?: string;
}
