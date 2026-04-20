import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { knowledgeSections } from '../../core/mock-data';

@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="architecture-list">
      <section class="card" *ngFor="let section of sections">
        <p class="eyebrow">{{ section.title }}</p>
        <h3>{{ section.summary }}</h3>
        <div class="knowledge-grid">
          <div class="copy">
            <article>
              <strong>Nội dung chính</strong>
              <ul>
                <li *ngFor="let bullet of section.bullets">{{ bullet }}</li>
              </ul>
            </article>
            <article>
              <strong>Built-in API / điểm tích hợp</strong>
              <ul>
                <li *ngFor="let note of section.apiNotes">{{ note }}</li>
              </ul>
            </article>
            <article>
              <strong>Ghi chú sample code</strong>
              <ul>
                <li *ngFor="let note of section.sampleNotes">{{ note }}</li>
              </ul>
            </article>
          </div>

          <div class="diagram">
            <div class="lane" *ngFor="let lane of section.diagram">
              <div class="lane__label">{{ lane.label }}</div>
              <div class="lane__track">
                <article class="node" *ngFor="let node of lane.nodes">
                  <strong>{{ node.title }}</strong>
                  <span>{{ node.subtitle }}</span>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .architecture-list {
      display: grid;
      gap: 1rem;
    }

    .card {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0.3rem 0 1rem;
    }

    .knowledge-grid {
      display: grid;
      grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
      gap: 1rem;
    }

    .copy {
      display: grid;
      gap: 0.8rem;
    }

    .copy article,
    .node {
      border-radius: 20px;
      padding: 1rem;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    .copy strong,
    .node strong {
      display: block;
      margin-bottom: 0.55rem;
    }

    ul {
      margin: 0;
      padding-left: 1.2rem;
      color: #6f625a;
    }

    li + li {
      margin-top: 0.4rem;
    }

    .diagram {
      display: grid;
      gap: 0.9rem;
    }

    .lane {
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr);
      gap: 0.8rem;
      align-items: start;
    }

    .lane__label {
      font-size: 0.76rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
      padding-top: 0.8rem;
    }

    .lane__track {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.8rem;
    }

    .node span {
      color: #6f625a;
      line-height: 1.5;
    }

    @media (max-width: 960px) {
      .knowledge-grid,
      .lane {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ArchitecturePageComponent {
  readonly sections = knowledgeSections;
}
