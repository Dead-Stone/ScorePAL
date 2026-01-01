/**
 * Centralized Chart.js registration
 * Prevents multiple registrations and improves performance
 */

let chartRegistered = false;
let registrationPromise: Promise<void> | null = null;

export const registerChartJS = async (): Promise<void> => {
  if (chartRegistered) {
    return Promise.resolve();
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      const {
        Chart,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        ArcElement,
        Title,
        Tooltip,
        Legend,
        Filler,
      } = await import('chart.js');

      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        ArcElement,
        Title,
        Tooltip,
        Legend,
        Filler
      );

      chartRegistered = true;
    } catch (error) {
      registrationPromise = null;
      throw error;
    }
  })();

  return registrationPromise;
};


