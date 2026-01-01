/**
 * StandardCard - Consistent card component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DESIGN_CONSTANTS } from '@/constants/design';

interface StandardCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  title,
  subtitle,
  children,
  headerAction,
  className = '',
}) => {
  return (
    <Card className={className} style={{ borderRadius: DESIGN_CONSTANTS.components.card.borderRadius }}>
      {(title || subtitle) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
};

