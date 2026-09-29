export interface SalaryFigures {
  currency: string;
  headcount: number;
  avgSalary: string;
  medianSalary: string;
  minSalary: string;
  maxSalary: string;
}

export interface DepartmentAggregate extends SalaryFigures {
  departmentId: string;
  departmentName: string;
}

export interface CountryAggregate extends SalaryFigures {
  countryId: string;
  countryName: string;
}

export interface PayBandBucket {
  label: string;
  headcount: number;
}
