export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  export const calcPercentage = (part: number, total: number) => {
    return total > 0 ? (part / total) * 100 : 0;
  };
  
  export const getValueColor = (value: number) => {
    return value >= 0 ? 'text-success-600' : 'text-danger-600';
  };