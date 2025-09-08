import { PartialType } from '@nestjs/mapped-types';
import { CreateMondayDto } from './create-monday.dto';

export class UpdateMondayDto extends PartialType(CreateMondayDto) {}
