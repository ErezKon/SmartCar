import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tyre-pressure-widget',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './tyre-pressure-widget.component.html',
  styleUrl: './tyre-pressure-widget.component.scss'
})
export class TyrePressureWidgetComponent {
  @Input() tyres: { fl: string; fr: string; rl: string; rr: string } = { fl: 'N/A', fr: 'N/A', rl: 'N/A', rr: 'N/A' };
}
