import { PartialType } from '@nestjs/mapped-types';
import { CreateDocuSealDto } from './create-docu-seal.dto';

export class UpdateDocuSealDto extends PartialType(CreateDocuSealDto) {}
