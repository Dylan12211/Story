import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationWsService } from './core/notification-ws.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit {
  private readonly ws = inject(NotificationWsService);

  ngOnInit(): void {
    this.ws.connect();
  }
}
