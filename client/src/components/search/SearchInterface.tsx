import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import SearchResults from "./SearchResults";
import type { Contact } from "@shared/schema";

interface SearchInterfaceProps {
  onContactSelect: (contact: Contact) => void;
}

export default function SearchInterface({ onContactSelect }: SearchInterfaceProps) {
  const [nameSearch, setNameSearch] = useState({
    firstName: "",
    middleName: "",
    lastName: ""
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    city: "",
    zipCode: "",
    ageMin: "",
    ageMax: "",
    party: "",
  });
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const quickFilters = [
    { id: "supporters", label: "Supporters" },
  ];

  const handleQuickFilterToggle = (filterId: string) => {
    setActiveQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const clearSearch = () => {
    setNameSearch({
      firstName: "",
      middleName: "",
      lastName: ""
    });
  };

  return (
    <div className="p-6">
      {/* Search Bar and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          {/* Name Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <Input
                type="text"
                placeholder="John"
                value={nameSearch.firstName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, firstName: e.target.value }))}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Middle Name</label>
              <Input
                type="text"
                placeholder="Michael"
                value={nameSearch.middleName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, middleName: e.target.value }))}
                data-testid="input-middle-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <Input
                type="text"
                placeholder="Smith"
                value={nameSearch.lastName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, lastName: e.target.value }))}
                data-testid="input-last-name"
              />
            </div>
          </div>
          
          {/* Clear Search Button */}
          {(nameSearch.firstName || nameSearch.middleName || nameSearch.lastName) && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                data-testid="button-clear-search"
              >
                <i className="fas fa-times mr-2"></i>
                Clear Names
              </Button>
            </div>
          )}
          
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={activeQuickFilters.includes(filter.id) ? "default" : "secondary"}
                size="sm"
                onClick={() => handleQuickFilterToggle(filter.id)}
                className="text-sm"
                data-testid={`filter-${filter.id}`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          
          {/* Advanced Filters */}
          <details className="border-t border-border pt-4">
            <summary 
              className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
              data-testid="button-advanced-filters"
            >
              Advanced Filters
            </summary>
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    type="text"
                    placeholder="Salt Lake City"
                    value={advancedFilters.city}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, city: e.target.value }))}
                    data-testid="input-filter-city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code</label>
                  <Input
                    type="text"
                    placeholder="84101"
                    value={advancedFilters.zipCode}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, zipCode: e.target.value }))}
                    data-testid="input-filter-zip"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Party</label>
                  <Select
                    value={advancedFilters.party}
                    onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, party: value }))}
                  >
                    <SelectTrigger data-testid="select-filter-party">
                      <SelectValue placeholder="All parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All parties</SelectItem>
                      <SelectItem value="DEM">DEM - Democrat</SelectItem>
                      <SelectItem value="REP">REP - Republican</SelectItem>
                      <SelectItem value="NPA">NPA - No Party Affiliation</SelectItem>
                      <SelectItem value="IND">IND - Independent</SelectItem>
                      <SelectItem value="LPF">LPF - Libertarian Party of Florida</SelectItem>
                      <SelectItem value="GRE">GRE - Green Party</SelectItem>
                      <SelectItem value="CSV">CSV - Constitution Party</SelectItem>
                      <SelectItem value="NLP">NLP - Natural Law Party</SelectItem>
                      <SelectItem value="CPF">CPF - Communist Party</SelectItem>
                      <SelectItem value="CPP">CPP - Christian Progressive Party</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age Range</label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="18"
                      value={advancedFilters.ageMin}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMin: e.target.value }))}
                      data-testid="input-age-min"
                    />
                    <span className="flex items-center text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="65"
                      value={advancedFilters.ageMax}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMax: e.target.value }))}
                      data-testid="input-age-max"
                    />
                  </div>
                </div>
              </div>
            )}
          </details>
        </CardContent>
      </Card>

      {/* Search Results */}
      <SearchResults 
        nameSearch={nameSearch}
        filters={{ ...advancedFilters, quickFilters: activeQuickFilters }}
        onContactSelect={onContactSelect}
      />
    </div>
  );
}
