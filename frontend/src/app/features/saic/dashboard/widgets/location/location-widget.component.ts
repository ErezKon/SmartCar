import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-location-widget',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './location-widget.component.html',
  styleUrl: './location-widget.component.scss'
})
export class LocationWidgetComponent {
  @Input() location = 'N/A';
}
