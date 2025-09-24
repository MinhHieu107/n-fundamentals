import { IsArray, IsDateString, IsMilitaryTime, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSongDTO {
    @IsString()
    @IsNotEmpty()
    readonly title: string;
     
    @IsNotEmpty()
    @IsArray()
    readonly artists: string[];
   
    @IsNotEmpty()
    @IsDateString()
   readonly releaseDate: Date;

   @IsMilitaryTime()
   readonly duration: Date;

   @IsString()
   @IsOptional()
   readonly lyrics: string;
}