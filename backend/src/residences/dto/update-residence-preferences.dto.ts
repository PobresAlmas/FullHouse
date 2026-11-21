import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, ValidateNested } from "class-validator";

const NOTICE_DAYS = [1, 3, 5, 7, 14];

export class NotificationPreferencesDto {
    @IsOptional() @IsBoolean() newTasks?: boolean;
    @IsOptional() @IsBoolean() newExpenses?: boolean;
    @IsOptional() @IsBoolean() upcomingDueDates?: boolean;
    @IsOptional() @IsBoolean() residentInvitations?: boolean;
    @IsOptional() @IsBoolean() houseUpdates?: boolean;
}

export class PantryPreferencesDto {
    @IsOptional() @IsIn(NOTICE_DAYS) expirationNoticeDays?: number;
    @IsOptional() @IsBoolean() showExpired?: boolean;
}

export class FinancePreferencesDto {
    @IsOptional() @IsIn(NOTICE_DAYS) dueNoticeDays?: number;
    @IsOptional() @IsBoolean() showOverdue?: boolean;
}

export class PetPreferencesDto {
    @IsOptional() @IsBoolean() vaccineReminders?: boolean;
    @IsOptional() @IsBoolean() dewormingReminders?: boolean;
    @IsOptional() @IsBoolean() appointmentReminders?: boolean;
}

export class UpdateResidencePreferencesDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => NotificationPreferencesDto)
    notifications?: NotificationPreferencesDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => PantryPreferencesDto)
    pantry?: PantryPreferencesDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FinancePreferencesDto)
    finance?: FinancePreferencesDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => PetPreferencesDto)
    pets?: PetPreferencesDto;
}
