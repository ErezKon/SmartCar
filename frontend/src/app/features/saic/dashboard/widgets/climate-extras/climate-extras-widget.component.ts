import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-climate-extras-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatDividerModule, CommandButtonComponent],
  templateUrl: './climate-extras-widget.component.html',
  styleUrl: './climate-extras-widget.component.scss'
})
export class ClimateExtrasWidgetComponent {
  @Input() heatedSteeringStatus: CmdStatus = 'idle';
  @Input() frontDefrostStatus: CmdStatus = 'idle';
  @Input() rearWindowHeatStatus: CmdStatus = 'idle';
  @Input() seatsHeatStatus: CmdStatus = 'idle';
  @Input() seatHeatDriverLevel = 0;
  @Input() seatHeatPassengerLevel = 0;

  @Output() seatHeatDriverLevelChange = new EventEmitter<number>();
  @Output() seatHeatPassengerLevelChange = new EventEmitter<number>();
  @Output() setHeatedSteering = new EventEmitter<boolean>();
  @Output() setFrontDefrost = new EventEmitter<boolean>();
  @Output() setRearWindowHeat = new EventEmitter<boolean>();
  @Output() applySeatsHeat = new EventEmitter<void>();

  onDriverLevelChange(val: number): void {
    this.seatHeatDriverLevel = val;
    this.seatHeatDriverLevelChange.emit(val);
  }

  onPassengerLevelChange(val: number): void {
    this.seatHeatPassengerLevel = val;
    this.seatHeatPassengerLevelChange.emit(val);
  }
}
