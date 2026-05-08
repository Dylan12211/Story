import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { knowledgeSections } from '../../core/mock-data';

@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architecture-page.component.html',
  styleUrls: ['./architecture-page.component.scss']})
export class ArchitecturePageComponent {
  readonly sections = knowledgeSections;
}
