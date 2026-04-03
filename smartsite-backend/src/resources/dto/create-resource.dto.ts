export class CreateResourceDto {
  type: 'Human' | 'Equipment';
  name: string;
  role: string;
  availability?: boolean;
}