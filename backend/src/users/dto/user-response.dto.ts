import { HousingStatus } from "../enums/housing-status.enum.js";

export class UserRespondeDto {
    id: string;
    code: string;
    name: string;
    nickname?: string;
    email: string;
    photo?: string;
    housingStatus: HousingStatus;
}
