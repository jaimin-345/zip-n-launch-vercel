import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Car, DollarSign, Users, Calendar, ExternalLink } from 'lucide-react';
import { currency } from '@/lib/contractUtils';

const OverviewTab = ({ personnel, travelData, setTravelData, contractSettings }) => {

  const getPersonTravel = (memberId) => travelData[memberId] || {};

  const getFlightCost = (memberId) => {
    const travel = getPersonTravel(memberId);
    return parseFloat(travel.flight?.cost) || 0;
  };

  const getHotelCost = (memberId) => {
    const travel = getPersonTravel(memberId);
    return parseFloat(travel.hotel?.cost) || 0;
  };

  const getRentalCost = (memberId) => {
    const travel = getPersonTravel(memberId);
    return parseFloat(travel.rentalCar?.cost) || 0;
  };

  const getTotalCost = (memberId) =>
    getFlightCost(memberId) + getHotelCost(memberId) + getRentalCost(memberId);

  const grandTotalFlights = personnel.reduce((s, m) => s + getFlightCost(m.id), 0);
  const grandTotalHotels = personnel.reduce((s, m) => s + getHotelCost(m.id), 0);
  const grandTotalRentals = personnel.reduce((s, m) => s + getRentalCost(m.id), 0);
  const grandTotal = grandTotalFlights + grandTotalHotels + grandTotalRentals;

  const completedCount = personnel.filter((m) => {
    const t = getPersonTravel(m.id);
    return t.flight?.airline || t.hotel?.hotelName || t.rentalCar?.company;
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{personnel.length}</p>
            <p className="text-xs text-muted-foreground">Personnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Plane className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{currency(grandTotalFlights)}</p>
            <p className="text-xs text-muted-foreground">Flights</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Hotel className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{currency(grandTotalHotels)}</p>
            <p className="text-xs text-muted-foreground">Hotels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Car className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{currency(grandTotalRentals)}</p>
            <p className="text-xs text-muted-foreground">Rental Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{currency(grandTotal)}</p>
            <p className="text-xs text-muted-foreground">Total Travel</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline">{completedCount}/{personnel.length} have travel details</Badge>
        {contractSettings?.effectiveDate && contractSettings?.expirationDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Event: {contractSettings.effectiveDate} to {contractSettings.expirationDate}
          </span>
        )}
      </div>

      {/* Employee Travel Overview Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employee Travel Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Travel Start</th>
                  <th className="text-left px-4 py-3 font-medium">Travel End</th>
                  <th className="text-right px-4 py-3 font-medium">Flight</th>
                  <th className="text-right px-4 py-3 font-medium">Hotel</th>
                  <th className="text-right px-4 py-3 font-medium">Rental Car</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      No personnel found. Add staff in Contract Management first.
                    </td>
                  </tr>
                ) : (
                  personnel.map((member) => {
                    const travel = getPersonTravel(member.id);
                    const travelStart = travel.travelStart || '';
                    const travelEnd = travel.travelEnd || '';
                    const hasDetails = travel.flight?.airline || travel.hotel?.hotelName || travel.rentalCar?.company;
                    const total = getTotalCost(member.id);

                    return (
                      <tr key={member.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{member.name || 'Unnamed'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{member.roleName}</td>
                        <td className="px-4 py-3">{travelStart || '—'}</td>
                        <td className="px-4 py-3">{travelEnd || '—'}</td>
                        <td className="px-4 py-3 text-right">{getFlightCost(member.id) ? currency(getFlightCost(member.id)) : '—'}</td>
                        <td className="px-4 py-3 text-right">{getHotelCost(member.id) ? currency(getHotelCost(member.id)) : '—'}</td>
                        <td className="px-4 py-3 text-right">{getRentalCost(member.id) ? currency(getRentalCost(member.id)) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{total ? currency(total) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {hasDetails ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Booked</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {personnel.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>TOTAL</td>
                    <td className="px-4 py-3 text-right">{currency(grandTotalFlights)}</td>
                    <td className="px-4 py-3 text-right">{currency(grandTotalHotels)}</td>
                    <td className="px-4 py-3 text-right">{currency(grandTotalRentals)}</td>
                    <td className="px-4 py-3 text-right">{currency(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
